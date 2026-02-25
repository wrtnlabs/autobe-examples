import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_admin_api_rate_limits_create";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";

/**
 * Test API rate limit deletion authorization boundary.
 * Validates only administrators can delete rate limits, not regular users.
 * 1. Regular user attempts creation (fails)
 * 2. Admin creates rate limit (succeeds)
 * 3. Regular user attempts deletion (fails with 401/403)
 * 4. Admin deletes rate limit (succeeds)
 * Confirms authorization enforcement for privileged operations.
 */
export async function test_api_api_rate_limit_deletion_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Regular user registration and connection setup
  const userConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.discussionBoard.auth.user.join(userConnection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Regular user attempts to create rate limit (should fail)
  await TestValidator.httpError(
    "user cannot create rate limit",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.admin.api_rate_limits.create(
        userConnection,
        {
          body: {
            endpoint_path: "/api/" + RandomGenerator.alphabets(10),
            http_method: RandomGenerator.pick([
              "GET",
              "POST",
              "PUT",
              "DELETE",
            ] as const),
            rate_limit_type: RandomGenerator.pick([
              "ip_based",
              "user_based",
              "global",
            ] as const),
            requests_per_interval: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            interval_seconds: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            burst_limit: null satisfies number | null as number | null,
            enforcement_action: RandomGenerator.pick([
              "block",
              "throttle",
              "warning",
            ] as const),
            is_active: true,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardApiRateLimit.ICreate,
        },
      );
    },
  );
  // 3. Administrator registration and rate limit creation
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create test rate limit
  const rateLimit =
    await api.functional.discussionBoard.admin.api_rate_limits.create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/" + RandomGenerator.alphabets(10),
          http_method: RandomGenerator.pick([
            "GET",
            "POST",
            "PUT",
            "DELETE",
          ] as const),
          rate_limit_type: RandomGenerator.pick([
            "ip_based",
            "user_based",
            "global",
          ] as const),
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          burst_limit: null satisfies number | null as number | null,
          enforcement_action: RandomGenerator.pick([
            "block",
            "throttle",
            "warning",
          ] as const),
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimit);
  // 4. Regular user attempts deletion (should fail)
  await TestValidator.httpError(
    "user cannot delete rate limit",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.admin.api_rate_limits.erase(
        userConnection,
        {
          rateLimitId: rateLimit.id,
        },
      );
    },
  );
  // 5. Second administrator to test any admin can delete
  const admin2Connection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 6. Second admin deletes the rate limit (should succeed)
  await api.functional.discussionBoard.admin.api_rate_limits.erase(
    admin2Connection,
    {
      rateLimitId: rateLimit.id,
    },
  );
  // 7. Verify rate limit was deleted by attempting to delete again (should fail)
  await TestValidator.httpError("rate limit already deleted", 404, async () => {
    await api.functional.discussionBoard.admin.api_rate_limits.erase(
      adminConnection,
      {
        rateLimitId: rateLimit.id,
      },
    );
  });
}
