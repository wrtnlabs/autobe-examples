import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_post_filter_by_content_type(connection: api.IConnection): Promise<void> {
    // Create actor-specific connection
    const actorConnection: api.IConnection = { host: connection.host };
    
    // Prepare filter for text posts
    const request: ICommunityPlatformPost.IRequest = {
        content_type: "text",
    };

    // Call API with content type filter
    const response: IPageICommunityPlatformPost.ISummary = await api.functional.communityPlatform.posts.index(actorConnection, {
        body: request,
    });

    // Validate response structure
    typia.assert(response);
    
    // Verify all posts have content_type = "text"
    for (const post of response.data) {
        TestValidator.equals(`Content type should be "text", was \"${post.content_type}\"`, post.content_type, "text");
    }
}