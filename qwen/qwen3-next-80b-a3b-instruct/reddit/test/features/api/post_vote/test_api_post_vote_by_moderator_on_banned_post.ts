import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";

export async function test_api_post_vote_by_moderator_on_banned_post(
  connection: api.IConnection,
) {
  // Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Moderator123!";

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: "dummy_moderator_id",
    });
  typia.assert(moderator);

  // Create community as member
  const communityName = RandomGenerator.name();
  const communityDescription = RandomGenerator.paragraph();
  const communityTags = ArrayUtil.repeat(2, () =>
    RandomGenerator.alphaNumeric(4),
  );

  // Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member123!";

  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com/",
      ip: "192.168.1.1",
    } satisfies IMember.ICreate,
  });

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          tags: communityTags,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post as member
  const postContent = RandomGenerator.content();

  // ICommunityPlatformPost is a string type representing a unique identifier
  const postIdentifier: string =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: community.code,
        body: postContent satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(postIdentifier);

  // Switch back to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IModerator.IAuth,
  });

  // Cast vote as moderator on the post
  // According to DTO, ICommunityPlatformPostVote.IRequest is a string type
  // The actual value could be "up", "down", or another string as defined in business logic
  const voteValueString: string = "up";

  const voteResult: IPageICommunityPlatformPostVote.ISummary =
    await api.functional.communityPlatform.moderator.communities.posts.votes.index(
      connection,
      {
        communityCode: community.code,
        postCode: postIdentifier,
        body: voteValueString,
      },
    );
  typia.assert(voteResult);
}
