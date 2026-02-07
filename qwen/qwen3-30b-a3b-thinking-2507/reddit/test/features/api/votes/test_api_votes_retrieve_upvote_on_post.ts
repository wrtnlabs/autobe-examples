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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_votes_retrieve_upvote_on_post(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    
    await authorize_member_join(memberConnection, {
        body: { }
    });
    
    const voteId = typia.random<string & tags.Format<"uuid">>();
    const vote = await api.functional.communityPlatform.member.votes.at(memberConnection, {
        voteId,
    });
    typia.assert(vote);
    TestValidator.equals("vote type is up", vote.vote_type, "up");
    TestValidator.equals("votable type is post", vote.votable_type, "post");
}