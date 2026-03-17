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

export async function test_api_admin_dashboard_statistics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin using utility function
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // Access dashboard endpoint using admin connection
  const dashboard =
    await api.functional.communityPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Business logic validation only (no type validation after typia.assert)
  TestValidator.predicate(
    "community has subscriber count",
    () => dashboard.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community owner has verified status",
    () => typeof dashboard.owner.email_verified === "boolean",
  );
  // Validate timestamps consistency
  const createdAt = new Date(dashboard.created_at);
  const updatedAt = new Date(dashboard.updated_at);
  TestValidator.predicate(
    "updated_at not before created_at",
    () => updatedAt >= createdAt,
  );
  // Validate optional fields business logic
  if (dashboard.description !== null && dashboard.description !== undefined) {
    const description = dashboard.description; // Capture narrowed value
    TestValidator.predicate(
      "description is not empty when present",
      () => description.trim().length > 0,
    );
  }
  if (dashboard.deleted_at !== null && dashboard.deleted_at !== undefined) {
    const deletedAt = new Date(dashboard.deleted_at);
    TestValidator.predicate(
      "deleted_at not before created_at",
      () => deletedAt >= createdAt,
    );
  }
  if (
    dashboard.owner.last_login_at !== null &&
    dashboard.owner.last_login_at !== undefined
  ) {
    const lastLoginAt = new Date(dashboard.owner.last_login_at);
    const registeredAt = new Date(dashboard.owner.registered_at);
    TestValidator.predicate(
      "last_login_at not before registration",
      () => lastLoginAt >= registeredAt,
    );
  }
}
