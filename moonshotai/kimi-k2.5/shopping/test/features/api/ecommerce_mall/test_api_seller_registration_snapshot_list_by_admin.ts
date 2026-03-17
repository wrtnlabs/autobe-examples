import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
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

export async function test_api_seller_registration_snapshot_list_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Create seller registration
  const registration = typia.assert<IEcommerceMallSellerRegistration & IEntity>(
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    ),
  );
  // Admin approves registration to create snapshot history
  const approved =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: registration.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approved);
  // Query snapshots for the registration
  const snapshots =
    await api.functional.ecommerceMall.admin.seller_registrations.snapshots.index(
      adminConnection,
      {
        registrationId: registration.id,
        body: {
          sortBy: "created_at",
          sortDirection: "desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate pagination metadata exists and has correct structure
  TestValidator.predicate(
    "pagination has current page",
    typeof snapshots.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof snapshots.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof snapshots.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof snapshots.pagination.pages === "number",
  );
  // Validate snapshot data array exists and contains at least one snapshot
  TestValidator.predicate(
    "snapshots data is array",
    Array.isArray(snapshots.data),
  );
  TestValidator.predicate(
    "has at least one snapshot",
    snapshots.data.length >= 1,
  );
  // Validate first snapshot has required fields (id, createdAt, reviewer)
  const firstSnapshot = snapshots.data[0];
  TestValidator.predicate(
    "snapshot has valid id",
    typeof firstSnapshot.id === "string",
  );
  TestValidator.predicate(
    "snapshot has valid createdAt",
    typeof firstSnapshot.createdAt === "string",
  );
  TestValidator.predicate(
    "snapshot has reviewer field",
    firstSnapshot.reviewer !== undefined,
  );
}