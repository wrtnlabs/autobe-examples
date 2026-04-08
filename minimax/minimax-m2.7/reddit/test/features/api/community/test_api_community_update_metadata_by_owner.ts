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

export async function test_api_community_update_metadata_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Create a new community with original metadata
  const createBody: IRedditCloneCommunity.ICreate = {
    name: "test_community",
    description: "Original description",
  } satisfies IRedditCloneCommunity.ICreate;
  const createdCommunity: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: createBody },
    );
  typia.assert(createdCommunity);
  // 3. Update the community with new metadata
  const updateBody: IRedditCloneCommunity.IUpdate = {
    name: "updated_community",
    description: "Updated description",
  } satisfies IRedditCloneCommunity.IUpdate;
  const updatedCommunity: IRedditCloneCommunity =
    await api.functional.redditClone.member.communities.update(
      memberConnection,
      {
        communityId: createdCommunity.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Validations
  TestValidator.equals(
    "community name updated",
    updatedCommunity.name,
    "updated_community",
  );
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description,
    "Updated description",
  );
  TestValidator.equals(
    "owner matches authenticated member",
    updatedCommunity.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "subscriber count unchanged",
    updatedCommunity.subscriberCount,
    0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedCommunity.updatedAt !== undefined &&
      updatedCommunity.updatedAt !== null,
  );
}
