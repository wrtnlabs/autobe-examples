import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator search of seller profile snapshots endpoint returning paginated immutable audit trail records.
 *
 * Validates the complete workflow of administrator authentication followed by searching seller profile snapshots for a specific profile ID. Each snapshot preserves before and after values for shop name, shop description, and logo URI modifications. Fields not involved in a specific modification event return null, providing precise attribute-level change tracking for administrative oversight and dispute resolution.
 *
 * 1. Administrator authenticates with email and password credentials.
 * 2. Administrator searches snapshots using pagination parameters for a specific seller profile ID.
 * 3. Validates paginated response structure with metadata and snapshot data array.
 * 4. Confirms pagination metadata correctness including current page, limit, total records, and total pages.
 */
export async function test_api_seller_profile_snapshots_admin_search(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Search seller profile snapshots
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommercePlatformSnapshotSellerProfile.IRequest;
  const snapshots =
    await api.functional.ecommercePlatform.admin.seller_profiles.snapshots.index(
      adminConnection,
      {
        profileId,
        body,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    snapshots.pagination.current,
    body.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    snapshots.pagination.limit,
    body.limit ?? 20,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
}
