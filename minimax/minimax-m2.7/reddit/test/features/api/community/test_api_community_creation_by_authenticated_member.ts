import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_creation_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a community with valid name and description
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: "programming_discussion",
          description: "A place to discuss programming topics",
        },
      },
    );
  typia.assert(community);
  // 3. Validate response
  TestValidator.equals(
    "community name matches",
    community.name,
    "programming_discussion",
  );
  TestValidator.equals(
    "description matches",
    community.description,
    "A place to discuss programming topics",
  );
  TestValidator.equals("subscriberCount is 0", community.subscriberCount, 0);
  TestValidator.equals(
    "member id matches authenticated user",
    community.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member username matches authenticated user",
    community.member.username,
    authorized.username,
  );
  TestValidator.predicate("icon is undefined", community.icon === undefined);
  TestValidator.predicate(
    "createdAt is present",
    community.createdAt !== undefined && community.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is present",
    community.updatedAt !== undefined && community.updatedAt !== null,
  );
  TestValidator.equals("deletedAt is null", community.deletedAt, null);
}
