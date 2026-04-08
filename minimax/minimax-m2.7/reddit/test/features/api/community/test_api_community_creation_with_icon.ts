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

export async function test_api_community_creation_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload icon file
  const iconFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(iconFile);
  // 3. Create community with icon
  const community = await api.functional.redditClone.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: iconFile satisfies IRedditCloneFile,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Validate response
  TestValidator.equals("member matches", community.member.id, authorized.id);
  TestValidator.predicate("icon exists", community.icon !== undefined);
  TestValidator.equals(
    "icon file id matches",
    community.icon!.file.id,
    iconFile.id,
  );
  TestValidator.equals(
    "icon original filename matches",
    community.icon!.file.originalFilename,
    iconFile.originalFilename,
  );
  TestValidator.equals(
    "icon mime type matches",
    community.icon!.file.mimeType,
    iconFile.mimeType,
  );
  TestValidator.equals(
    "icon file size matches",
    community.icon!.file.fileSize,
    iconFile.fileSize,
  );
}
