import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_community_at_private_access_control(
  connection: api.IConnection,
) {
  // 1) Provision two test members: communityCreator and outsider
  const creatorConn: api.IConnection = { ...connection, headers: {} };
  const creatorPayload = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const creator: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(creatorConn, {
      body: creatorPayload,
    });
  typia.assert(creator);

  const outsiderConn: api.IConnection = { ...connection, headers: {} };
  const outsiderPayload = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const outsider: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(outsiderConn, {
      body: outsiderPayload,
    });
  typia.assert(outsider);

  // 2) Using communityCreator, create a private community
  const createBody = {
    name: `private-${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: true,
    visibility: "private",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(
      creatorConn,
      { body: createBody },
    );
  typia.assert(community);

  // Sanity: created community is private
  TestValidator.equals(
    "created community is private",
    community.is_private,
    true,
  );

  // 3) As an unauthenticated client, call GET and expect 401 or 403
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated client cannot access private community",
    [401, 403],
    async () => {
      await api.functional.communityPortal.communities.at(unauthConn, {
        communityId: community.id,
      });
    },
  );

  // 4) As outsider (authenticated but not subscribed), call GET and expect 403
  await TestValidator.httpError(
    "outsider (not subscribed) cannot access private community",
    403,
    async () => {
      await api.functional.communityPortal.communities.at(outsiderConn, {
        communityId: community.id,
      });
    },
  );

  // 5) Subscribe outsider to the private community
  const subscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      outsiderConn,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // After subscribing, outsider should be able to GET the community details
  const communityByOutsider: ICommunityPortalCommunity =
    await api.functional.communityPortal.communities.at(outsiderConn, {
      communityId: community.id,
    });
  typia.assert(communityByOutsider);
  TestValidator.equals(
    "outsider (subscribed) can access community id",
    communityByOutsider.id,
    community.id,
  );

  // Creator should also be able to GET the community details
  const communityByCreator: ICommunityPortalCommunity =
    await api.functional.communityPortal.communities.at(creatorConn, {
      communityId: community.id,
    });
  typia.assert(communityByCreator);
  TestValidator.equals(
    "creator can access community id",
    communityByCreator.id,
    community.id,
  );

  // Verify returned canonical fields exist when access permitted
  TestValidator.predicate(
    "community has slug",
    communityByCreator.slug !== undefined && communityByCreator.slug.length > 0,
  );
  TestValidator.predicate(
    "community has name",
    communityByCreator.name !== undefined && communityByCreator.name.length > 0,
  );
}
