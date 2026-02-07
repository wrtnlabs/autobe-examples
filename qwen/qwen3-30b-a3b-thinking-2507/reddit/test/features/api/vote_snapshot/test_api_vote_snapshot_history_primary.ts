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
import type { ICommunityPlatformVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteSnapshot";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_vote_snapshot_history_primary(connection: api.IConnection): Promise<void> {
    // 1. Member account creation
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            name: RandomGenerator.name(),
        }
    });

    // 2. Vote creation
    const vote = await generate_random_community_platform_member_votes_create(memberConnection, {
        body: {
            vote_type: "up",
            votable_type: "post",
            votable_id: typia.random<string & tags.Format<"uuid">>(),
        }
    });
    typia.assert(vote);

    // 3. Modify vote
    const modifiedVote = await api.functional.communityPlatform.member.votes.update(memberConnection, {
        voteId: vote.id,
        body: {
            vote_type: "down",
        }
    });
    typia.assert(modifiedVote);

    // 4. Verify snapshot history
    const snapshots = await api.functional.communityPlatform.member.votes.snapshots.index(memberConnection, {
        voteId: vote.id,
        body: {
            page: 1,
            size: 25,
        }
    });
    typia.assert(snapshots);

    // 5. Validation - removed invalid properties (before_vote_type, after_vote_type) because they don't exist in the DTO
    TestValidator.equals("has at least one snapshot entry", snapshots.data.length > 0, true);
}