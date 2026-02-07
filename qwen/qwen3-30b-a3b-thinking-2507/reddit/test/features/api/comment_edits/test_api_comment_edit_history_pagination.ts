import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEdit";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEdit";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_edit_history_pagination(connection: api.IConnection): Promise<void> {
    // 1. Member setup
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "test123",
            name: RandomGenerator.name(),
        }
    });
    
    // 2. Create test post
    const postId = typia.random<string & tags.Format<"uuid">>();
    
    // 3. Create initial comment
    const initialComment = await generate_random_community_platform_member_posts_comments_create(memberConnection, { params: { postId } });
    
    // 4. Create 55 additional comments to simulate edit history
    for (let i = 0; i < 55; i++) {
        await generate_random_community_platform_member_posts_comments_create(memberConnection, { params: { postId } });
    }
    
    // 5. Retrieve edit history with limit=50
    const editHistory = await api.functional.communityPlatform.member.comments.edits.index(memberConnection, {
        commentId: initialComment.id,
        body: {
            limit: 50,
        },
    });
    typia.assert(editHistory);
    
    // 6. Validate pagination metadata
    TestValidator.equals("should have current page 1", editHistory.pagination.current, 1);
    TestValidator.equals("should have limit 50", editHistory.pagination.limit, 50);
    TestValidator.equals("should have total records 55", editHistory.pagination.records, 55);
    TestValidator.equals("should have correct page count", editHistory.pagination.pages, 2);
    
    // 7. Validate data count per page
    TestValidator.equals("should have 50 records on first page", editHistory.data.length, 50);
}