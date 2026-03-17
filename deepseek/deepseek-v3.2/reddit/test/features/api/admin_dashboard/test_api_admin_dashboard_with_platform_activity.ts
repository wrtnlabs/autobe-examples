import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_with_platform_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using authorize_admin_join utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // Retrieve dashboard data
  const dashboard =
    await api.functional.communityPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Validate business logic (not types - typia.assert already did complete validation)
  // Check subscriber_count is non-negative
  TestValidator.predicate(
    "subscriber_count should be non-negative",
    dashboard.subscriber_count >= 0,
  );
  // Check timestamps ordering: created_at should not be after updated_at
  const createdAt = new Date(dashboard.created_at);
  const updatedAt = new Date(dashboard.updated_at);
  TestValidator.predicate(
    "created_at should not be after updated_at",
    createdAt <= updatedAt,
  );
  // Check community is active (deleted_at is null)
  TestValidator.equals(
    "community should be active (not deleted)",
    dashboard.deleted_at,
    null,
  );
  // Check owner has valid email format (typia.assert already validated format)
  // Additional business logic: owner email should be valid email string
  TestValidator.predicate(
    "owner email should contain @ symbol",
    dashboard.owner.email.includes("@"),
  );
}
