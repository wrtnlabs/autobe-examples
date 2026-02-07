import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_voting_update_unauthorized(connection: api.IConnection): Promise<void> {
    // 1. Create vote as creator
    const creatorConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(creatorConnection, { body: {} });
    const vote = await generate_random_community_platform_member_votes_create(creatorConnection, {});
    
    // 2. Auth as non-owner user
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(userConnection, { body: {} });
    
    // 3. Attempt update with non-owner - should fail with 403
    await TestValidator.httpError("unauthorized update attempt for vote", 403, async () => {
        await api.functional.communityPlatform.member.votes.update(userConnection, {
            voteId: vote.id,
            body: typia.assert<ICommunityPlatformVote.IUpdate>({ vote_type: "up" }),
        });
    });
}