import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_admin_seller_registration_history_multiple_submissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller submits initial registration
  const firstRegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(firstRegistration);
  const firstRegistrationId = (
    firstRegistration as IEcommerceMallSellerRegistration.ISummary
  ).id;
  // 4. Admin rejects the registration
  const rejectionReason = "Incomplete business documentation provided";
  const rejectedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: firstRegistrationId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(rejectedRegistration);
  // 5. Seller submits re-registration
  const secondRegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(secondRegistration);
  const secondRegistrationId = (
    secondRegistration as IEcommerceMallSellerRegistration.ISummary
  ).id;
  // 6. Admin views the seller's registration history
  const history =
    await api.functional.ecommerceMall.admin.sellers.registrations.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          limit: 10,
          cursor: null,
          status: null,
          sellerId: seller.id,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(history);
  // 7. Verify the response contains both registrations
  TestValidator.equals("history has 2 registrations", history.data.length, 2);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", history.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    history.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages", history.pagination.pages, 1);
  // Find the rejected registration (first one)
  const rejectedRecord = typia.assert(
    history.data.find((r) => r.id === firstRegistrationId)!
  );
  TestValidator.equals(
    "rejected record status",
    rejectedRecord.status,
    "rejected",
  );
  TestValidator.equals(
    "rejected record has rejection reason",
    rejectedRecord.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejected record has reviewer",
    rejectedRecord.reviewer !== null,
  );
  TestValidator.predicate(
    "rejected record has reviewedAt",
    rejectedRecord.reviewedAt !== null,
  );
  TestValidator.equals(
    "rejected record seller id matches",
    rejectedRecord.seller.id,
    seller.id,
  );
  // Find the pending/second registration
  const pendingRecord = typia.assert(
    history.data.find((r) => r.id === secondRegistrationId)!
  );
  TestValidator.predicate(
    "pending record status is pending or approved",
    pendingRecord.status === "pending" || pendingRecord.status === "approved",
  );
  TestValidator.equals(
    "pending record has no rejection reason",
    pendingRecord.rejectionReason,
    null,
  );
  TestValidator.equals(
    "pending record seller id matches",
    pendingRecord.seller.id,
    seller.id,
  );
  // Verify timestamps are present
  TestValidator.predicate(
    "rejected record has valid createdAt",
    !Number.isNaN(new Date(rejectedRecord.createdAt).getTime()),
  );
  TestValidator.predicate(
    "pending record has valid createdAt",
    !Number.isNaN(new Date(pendingRecord.createdAt).getTime()),
  );
  TestValidator.predicate(
    "rejected record created before or at same time as pending",
    new Date(rejectedRecord.createdAt) <= new Date(pendingRecord.createdAt),
  );
}