import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_comment_replies_success(connection: api.IConnection): Promise<void> {
    // 1. Create guest session for anonymous access
    const guestConnection: api.IConnection = { host: connection.host };
    const guestAuth: IRedditPlatformGuest.IAuthorized = await authorize_guest_join(guestConnection, {
        body: {
            fingerprint: typia.random<string>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(guestAuth);
    // 2. Generate valid comment UUID for testing
    const parentCommentId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Call the replies endpoint as guest
    const response: IPageIRedditPlatformComment.ISummary = await api.functional.redditPlatform.guest.comments.replies(guestConnection, { commentId: parentCommentId });
    typia.assert(response);
    // 4. Validate pagination metadata structure
    typia.assert(response.pagination);
    TestValidator.equals("pagination has current page", response.pagination.current, 1);
    TestValidator.predicate("pagination has positive limit", response.pagination.limit > 0);
    TestValidator.predicate("pagination has non-negative total records", response.pagination.records >= 0);
    TestValidator.predicate("pagination has valid page count", response.pagination.pages >= 0);
    // 5. Validate records and pages calculation
    TestValidator.equals("pagination pages calculated correctly", response.pagination.pages, Math.ceil(response.pagination.records / response.pagination.limit));
    // 6. Validate all returned comments are IRedditPlatformComment.ISummary
    for (const reply of response.data) {
        typia.assert(reply);
        // Validate reply has required ID
        typia.assert(reply.id);
        // Validate author information is joined
        typia.assert(reply.author);
        TestValidator.equals("reply has author ID", reply.author.id !== undefined, true);
        TestValidator.equals("reply has author username", reply.author.username !== undefined, true);
        // Validate post reference is joined
        typia.assert(reply.post);
        TestValidator.equals("reply has post ID", reply.post.id !== undefined, true);
        TestValidator.equals("reply has post title", reply.post.title !== undefined, true);
        // Validate vote scores exist
        TestValidator.equals("reply has upvotes count", reply.upvotes_count !== undefined, true);
        TestValidator.equals("reply has downvotes count", reply.downvotes_count !== undefined, true);
        TestValidator.equals("reply has score", reply.score !== undefined, true);
        // Validate deleted_at is null (not deleted)
        TestValidator.equals("reply is not deleted", reply.deleted_at, null);
        // Validate timestamps are ISO date-time format
        typia.assert(reply.created_at);
        typia.assert(reply.updated_at);
        // Validate parent reference exists
        if (reply.parent !== undefined && reply.parent !== null) {
            typia.assert(reply.parent);
            typia.assert(reply.parent.id);
        }
    }
    // 7. Validate chronological ordering (oldest first)
    if (response.data.length > 1) {
        for (let i = 1; i < response.data.length; i++) {
            const prevReply = response.data[i - 1];
            const currReply = response.data[i];
            TestValidator.predicate(`reply ${i + 1} is after reply ${i} (chronological order)`, currReply.created_at >= prevReply.created_at);
        }
    }
    // 8. Validate no deleted replies in response
    for (const reply of response.data) {
        TestValidator.equals("all replies are active (not deleted)", reply.deleted_at, null);
    }
}