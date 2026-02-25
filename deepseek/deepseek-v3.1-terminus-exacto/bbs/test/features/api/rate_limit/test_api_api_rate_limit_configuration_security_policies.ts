import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_super_admin_api_rate_limits_create";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";

/**
 * Test security-focused rate limit configurations for critical endpoints.
 */
export async function test_api_api_rate_limit_configuration_security_policies(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000/super-admin/dashboard",
      referrer: "http://localhost:3000/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create critical authentication endpoint rate limit (IP-based, strict blocking)
  const authRateLimit =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard/auth/**",
          http_method: "POST",
          rate_limit_type: "ip_based",
          requests_per_interval: 10,
          interval_seconds: 60,
          enforcement_action: "block",
          is_active: true,
          description:
            "Prevent credential stuffing attacks on authentication endpoints",
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(authRateLimit);
  // Create administrative operations rate limit (user-based, throttling)
  const adminRateLimit =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard/superAdmin/**",
          http_method: "POST",
          rate_limit_type: "user_based",
          requests_per_interval: 5,
          interval_seconds: 300,
          burst_limit: 2,
          enforcement_action: "throttle",
          is_active: true,
          description: "Limit administrative operations to prevent abuse",
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(adminRateLimit);
  // Create global endpoint rate limit with burst protection
  const globalRateLimit =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard/**",
          http_method: "*",
          rate_limit_type: "global",
          requests_per_interval: 1000,
          interval_seconds: 3600,
          burst_limit: 50,
          enforcement_action: "warning",
          is_active: true,
          description: "Global API usage limit with burst protection",
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(globalRateLimit);
  // Create inactive policy to test status control
  const inactiveRateLimit =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard/admin/users/**",
          http_method: "DELETE",
          rate_limit_type: "user_based",
          requests_per_interval: 1,
          interval_seconds: 3600,
          enforcement_action: "block",
          is_active: false,
          description:
            "Critical user deletion operation - temporarily disabled",
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(inactiveRateLimit);
  // Validate rate limit configurations
  TestValidator.equals(
    "auth rate limit endpoint",
    authRateLimit.endpoint_path,
    "/discussionBoard/auth/**",
  );
  TestValidator.equals(
    "auth rate limit type",
    authRateLimit.rate_limit_type,
    "ip_based",
  );
  TestValidator.equals(
    "auth enforcement action",
    authRateLimit.enforcement_action,
    "block",
  );
  TestValidator.predicate(
    "auth rate limit active",
    authRateLimit.is_active === true,
  );
  TestValidator.equals(
    "admin rate limit endpoint",
    adminRateLimit.endpoint_path,
    "/discussionBoard/superAdmin/**",
  );
  TestValidator.equals(
    "admin rate limit type",
    adminRateLimit.rate_limit_type,
    "user_based",
  );
  TestValidator.equals(
    "admin enforcement action",
    adminRateLimit.enforcement_action,
    "throttle",
  );
  TestValidator.predicate(
    "admin rate limit has burst",
    adminRateLimit.burst_limit !== undefined && adminRateLimit.burst_limit !== null && adminRateLimit.burst_limit > 0,
  );
  TestValidator.equals(
    "global rate limit endpoint",
    globalRateLimit.endpoint_path,
    "/discussionBoard/**",
  );
  TestValidator.equals(
    "global rate limit http method",
    globalRateLimit.http_method,
    "*",
  );
  TestValidator.equals(
    "global enforcement action",
    globalRateLimit.enforcement_action,
    "warning",
  );
  TestValidator.predicate(
    "global rate limit interval reasonable",
    globalRateLimit.interval_seconds >= 3600,
  );
  TestValidator.notEquals(
    "inactive vs active policy status",
    inactiveRateLimit.is_active,
    authRateLimit.is_active,
  );
  TestValidator.predicate(
    "inactive policy marked inactive",
    inactiveRateLimit.is_active === false,
  );
  // Validate unique IDs for different configurations
  TestValidator.notEquals(
    "different rate limits have different IDs",
    authRateLimit.id,
    adminRateLimit.id,
  );
  TestValidator.notEquals(
    "all rate limits have unique IDs",
    authRateLimit.id,
    globalRateLimit.id,
  );
  TestValidator.notEquals(
    "all IDs are distinct",
    adminRateLimit.id,
    globalRateLimit.id,
  );
  TestValidator.notEquals(
    "inactive limit has different ID",
    inactiveRateLimit.id,
    authRateLimit.id,
  );
  // Validate timestamp properties
  TestValidator.predicate(
    "created at timestamp valid",
    new Date(authRateLimit.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at timestamp valid",
    new Date(authRateLimit.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "enforcement count zero for new rule",
    authRateLimit.enforcement_count,
    0,
  );
  TestValidator.equals(
    "enforced at null for new rule",
    authRateLimit.enforced_at,
    null,
  );
}