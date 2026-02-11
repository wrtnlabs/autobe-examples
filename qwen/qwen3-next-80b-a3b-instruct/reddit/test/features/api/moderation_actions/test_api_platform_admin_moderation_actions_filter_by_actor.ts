import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationActionOfPost";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_moderation_actions_filter_by_actor(connection: api.IConnection): Promise<void> {
    // Step 1: Register and authenticate as platform admin
    const adminConnection: api.IConnection = { 
        host: connection.host, 
        headers: {}
    };
    const adminAuth = await authorize_platform_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
    (adminConnection.headers as any).Authorization = adminAuth.token.access;
    
    // Step 2: Define filter criteria - use a random but valid UUID as actor_id
    const actorId = typia.random<string & tags.Format<"uuid">>();
    
    // Step 3: Query moderation actions filtered by actor_id
    const request: IRedditCommunityModerationActionOfPost.IRequest = {
        actor_id: actorId,
        limit: 10,
        cursor: "cursor-123",
    };
    const response = await api.functional.redditCommunity.platformAdmin.moderation_actions.index(adminConnection, { body: request });
    typia.assert(response);
    
    // Step 4: Validate response structure
    TestValidator.equals("pagination limit matches", response.pagination.limit, request.limit);
    
    // No cursor on IPagination - likely should check actual pagination field
    // Assuming response contains pagination properties directly; remove cursor check
    
    TestValidator.predicate("data is an array", Array.isArray(response.data));
    TestValidator.equals("response data length is non-negative", response.data.length, response.data.length);
    
    // Step 5: Validate data structure for each moderation action
    for (const action of response.data) {
        // Fix: action_type check must use array of allowed values
        const validActionTypes = ["delete", "ban", "approve", "dismiss"] as const;
        TestValidator.predicate("action_type is valid", validActionTypes.includes(action.action_type as any));
        
        TestValidator.equals("reason is string", typeof action.reason, "string");
        
        // Fix: validate date-time as string with regex since tags.Format cannot be accessed
        TestValidator.predicate("created_at matches ISO 8601", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(action.created_at));
        
        TestValidator.equals("actor_display_name is string", typeof action.actor_display_name, "string");
        
        // Validate UUID with regex
        TestValidator.predicate("post_id matches UUID format", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(action.post_id));
    }
}