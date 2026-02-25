import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfileSnapshot";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { prepare_random_reddit_comment } from "../../../prepare/prepare_random_reddit_comment";
import { generate_random_reddit_member_posts_comments_create } from "../../../generate/generate_random_reddit_member_posts_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comments_no_snapshots_case(connection: api.IConnection): Promise<void> {
    // 1. Create authenticated session
    const memberConnection: api.IConnection = { host: connection.host };
    const authResponse = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            username: RandomGenerator.name(),
        },
    });
    typia.assert(authResponse);

    // 2. Create a comment with no history
    const postId = typia.random<string & tags.Format<"uuid">>();
    const commentResponse = await generate_random_reddit_member_posts_comments_create(memberConnection, {
        params: { postId },
        body: {
            content: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 50 }),
        },
    });
    typia.assert(commentResponse);
    const commentId = commentResponse.id;

    // 3. Verify response structure when no snapshots exist
    const snapshotsResponse = await api.functional.reddit.member.comments.snapshots.index(memberConnection, {
        commentId,
        body: {
            page: 1,
            limit: 10,
        },
    });
    typia.assert(snapshotsResponse);

    // 4. Validate response structure
    TestValidator.equals("Should have empty data array", snapshotsResponse.data.length, 0);
    TestValidator.equals("Pagination records should be 0", snapshotsResponse.pagination.records, 0);
    TestValidator.equals("Pagination pages should be 0", snapshotsResponse.pagination.pages, 0);
}