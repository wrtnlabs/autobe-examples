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
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_community_update_icon_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Update connection with auth token
  memberConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `icon_test_${RandomGenerator.alphabets(8)}`,
          description: "Icon test community description",
        },
      },
    );
  typia.assert(community);
  // Validate initial community has no icon
  TestValidator.equals(
    "community initially has no icon",
    community.icon,
    undefined,
  );
  // 3. Upload an image file
  const uploadedFile =
    await generate_random_reddit_clone_member_files_create(memberConnection, {});
  typia.assert(uploadedFile);
  // 4. Update the community icon
  const updatedCommunity =
    await api.functional.redditClone.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          icon: {
            fileId: uploadedFile.id,
          } satisfies IRedditCloneCommunityIcon.IUpdate,
        } satisfies IRedditCloneCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // Validate response
  TestValidator.predicate(
    "updated community has icon",
    updatedCommunity.icon !== null && updatedCommunity.icon !== undefined,
  );
  TestValidator.equals(
    "icon file ID matches uploaded file",
    updatedCommunity.icon!.file.id,
    uploadedFile.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description unchanged",
    updatedCommunity.description,
    community.description,
  );
}
