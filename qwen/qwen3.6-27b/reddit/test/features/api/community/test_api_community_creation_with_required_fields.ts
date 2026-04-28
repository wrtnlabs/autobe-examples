import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

export async function test_api_community_creation_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(member);
  // 2. Community creation
  const name = RandomGenerator.paragraph({ sentences: 1 });
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const createBody = {
    name,
    description,
  } satisfies IREdditLikeCommunityCommunity.ICreate;
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: createBody,
      },
    );
  typia.assert(community);
  // 3. Validation
  // 3.1 ID is a valid UUID
  TestValidator.predicate(
    "community ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );
  // 3.2 Name matches input
  TestValidator.equals("community name matches input", community.name, name);
  // 3.3 Description matches input
  TestValidator.equals(
    "community description matches input",
    community.description,
    description,
  );
  // 3.4 Icon URI is null
  TestValidator.equals("icon_uri is null", community.icon_uri, null);
  // 3.5 Creator contains authenticated member's ID and username
  TestValidator.equals(
    "creator ID matches member ID",
    community.creator.id,
    member.id,
  );
  TestValidator.equals(
    "creator username matches member username",
    community.creator.username,
    member.username,
  );
  // 3.6 Created_at and updated_at are present and valid
  TestValidator.predicate(
    "created_at is a valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/i.test(community.created_at),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/i.test(community.updated_at),
  );
  // 3.7 Deleted_at is null
  TestValidator.equals("deleted_at is null", community.deleted_at, null);
}
