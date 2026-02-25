import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";
import { generate_random_discussion_board_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_admin_api_rate_limits_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_api_rate_limits_inactive_configuration(connection: api.IConnection): Promise<void> {
    // Create admin connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(admin);

    // Create an inactive rate limit configuration
    const rateLimitConfig = await generate_random_discussion_board_admin_api_rate_limits_create(adminConnection, {
        body: {
            is_active: false,
        },
    });
    typia.assert(rateLimitConfig);
    TestValidator.predicate("created rate limit is inactive", !rateLimitConfig.is_active);

    // Retrieve the inactive configuration
    const retrievedConfig = await api.functional.discussionBoard.admin.api_rate_limits.at(adminConnection, {
        rateLimitId: rateLimitConfig.id,
    });
    typia.assert(retrievedConfig);

    // Validate that the retrieved configuration matches the created one
    TestValidator.equals("config IDs match", retrievedConfig.id, rateLimitConfig.id);
    TestValidator.equals("endpoint paths match", retrievedConfig.endpoint_path, rateLimitConfig.endpoint_path);
    TestValidator.equals("HTTP methods match", retrievedConfig.http_method, rateLimitConfig.http_method);
    TestValidator.equals("rate limit types match", retrievedConfig.rate_limit_type, rateLimitConfig.rate_limit_type);
    TestValidator.equals("requests per interval match", retrievedConfig.requests_per_interval, rateLimitConfig.requests_per_interval);
    TestValidator.equals("interval seconds match", retrievedConfig.interval_seconds, rateLimitConfig.interval_seconds);
    TestValidator.equals("burst limits match", retrievedConfig.burst_limit, rateLimitConfig.burst_limit);
    TestValidator.equals("enforcement actions match", retrievedConfig.enforcement_action, rateLimitConfig.enforcement_action);
    TestValidator.predicate("retrieved rate limit is inactive", !retrievedConfig.is_active);
}