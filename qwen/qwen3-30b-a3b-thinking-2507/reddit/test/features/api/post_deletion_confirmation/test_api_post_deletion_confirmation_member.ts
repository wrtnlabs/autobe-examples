import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { prepare_random_reddit_post_text } from "../../../prepare/prepare_random_reddit_post_text";
import { generate_random_reddit_member_communities_posts_create } from "../../../generate/generate_random_reddit_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_deletion_confirmation_member(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as member
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: typia.random<IRedditMember.IJoin>(),
    });
    // 2. Generate valid community ID for subscription
    const communityId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Subscribe to community
    await api.functional.reddit.member.communities.subscribe(memberConnection, {
        communityId,
    });
    // 4. Create post for deletion confirmation
    const post = await generate_random_reddit_member_communities_posts_create(memberConnection, {
        params: { communityId },
    });
    // 5. Confirm deletion with valid post ID
    const confirmation = await api.functional.reddit.member.confirm_deletion.confirmDeletion(memberConnection, {
        body: {
            post_id: post.id,
        }
    });
    typia.assert(confirmation);
    // 6. Validate confirmation response
    TestValidator.equals("status is pending", confirmation.status, "pending");
    TestValidator.predicate("token length valid", confirmation.token.length === 36);
    TestValidator.equals("validation window within 1 hour", new Date(confirmation.validationWindow).getTime() - new Date().getTime(), 3600000);
}