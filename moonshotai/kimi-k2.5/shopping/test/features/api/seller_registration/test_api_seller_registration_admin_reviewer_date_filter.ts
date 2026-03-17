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

export async function test_api_seller_registration_admin_reviewer_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  const reviewerId = adminAuthorized.id;
  // 2. Create first seller and submit registration
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const registration1 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      seller1Connection,
      {},
    );
  typia.assert(registration1);
  const registration1Id = (registration1 as any).id;
  // 3. Create second seller and submit registration (this one will remain pending)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const registration2 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      seller2Connection,
      {},
    );
  typia.assert(registration2);
  const registration2Id = (registration2 as any).id;
  // 4. Review the first registration as admin
  const reviewStartTime = new Date().toISOString();
  await api.functional.ecommerceMall.admin.seller_registrations.update(
    adminConnection,
    {
      registrationId: registration1Id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  const reviewEndTime = new Date().toISOString();
  // 5. Query registrations with reviewerId and date range filters
  const queryResult =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          limit: 10,
          cursor: null,
          status: null,
          sellerId: null,
          reviewerId: reviewerId,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: reviewStartTime,
          reviewedAtTo: reviewEndTime,
          sortBy: null,
          sortOrder: null,
          page: 1,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(queryResult);
  // 6. Validate response
  TestValidator.predicate("query results contain reviewed registration", () =>
    queryResult.data.some((reg) => reg.id === registration1Id),
  );
  TestValidator.predicate(
    "query results do not contain unreviewed registration",
    () => !queryResult.data.some((reg) => reg.id === registration2Id),
  );
  const reviewedReg = queryResult.data.find(
    (reg) => reg.id === registration1Id,
  );
  TestValidator.equals(
    "reviewed registration has correct reviewer",
    reviewedReg?.reviewer?.id,
    reviewerId,
  );
  TestValidator.predicate(
    "reviewed registration has reviewedAt timestamp",
    () =>
      reviewedReg?.reviewedAt !== null && reviewedReg?.reviewedAt !== undefined,
  );
  TestValidator.equals(
    "reviewed registration status",
    reviewedReg?.status,
    "approved",
  );
}