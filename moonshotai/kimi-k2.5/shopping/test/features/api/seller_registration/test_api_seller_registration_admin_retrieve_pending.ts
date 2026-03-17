import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_registration_admin_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create seller connection for seller operations
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create a seller registration with pending status
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  // Extract registration ID from the created registration
  const registrationId = (
    registration as IEcommerceMallSellerRegistration & IEntity
  ).id;
  // Admin retrieves the registration details
  const retrieved = await api.functional.ecommerceMall.admin.registrations.at(
    adminConnection,
    {
      registrationId,
    },
  );
  // Validate the response structure
  typia.assert(retrieved);
  // Validate specific fields expected for a pending registration
  const typedRetrieved = retrieved as IEcommerceMallSellerRegistration & {
    id: string;
    sellerId: string;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    reviewerId: string | null;
    rejectionReason: string | null;
    snapshots: unknown[];
  };
  TestValidator.equals(
    "registration ID matches",
    typedRetrieved.id,
    registrationId,
  );
  TestValidator.predicate(
    "seller ID is defined",
    typedRetrieved.sellerId !== undefined,
  );
  TestValidator.equals("status is PENDING", typedRetrieved.status, "PENDING");
  TestValidator.predicate(
    "submittedAt is defined",
    typedRetrieved.submittedAt !== undefined,
  );
  TestValidator.equals(
    "reviewedAt is null for pending",
    typedRetrieved.reviewedAt,
    null,
  );
  TestValidator.equals(
    "reviewerId is null for pending",
    typedRetrieved.reviewerId,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null for pending",
    typedRetrieved.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(typedRetrieved.snapshots),
  );
}
