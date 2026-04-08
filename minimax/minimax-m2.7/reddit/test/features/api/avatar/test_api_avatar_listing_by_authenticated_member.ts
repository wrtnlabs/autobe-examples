import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileAssociation";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
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
import { generate_random_reddit_clone_member_avatars_create } from "../../../generate/generate_random_reddit_clone_member_avatars_create";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_avatar_listing_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload an avatar image for that member
  const avatarResponse =
    await generate_random_reddit_clone_member_avatars_create(
      memberConnection,
      {},
    );
  typia.assert(avatarResponse);
  // 3. Query the avatar listing endpoint
  const avatarList = await api.functional.redditClone.member.avatars.index(
    memberConnection,
    {
      body: {
        userId: authorized.id,
      } satisfies IRedditCloneFileAssociation.IRequest,
    },
  );
  typia.assert(avatarList);
  // 4. Validate pagination metadata
  TestValidator.predicate("has pagination", avatarList.pagination !== null);
  TestValidator.predicate(
    "current page is valid",
    avatarList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", avatarList.pagination.limit >= 1);
  TestValidator.predicate("records >= 1", avatarList.pagination.records >= 1);
  TestValidator.predicate("pages >= 1", avatarList.pagination.pages >= 1);
  // 5. Validate avatar data array exists and has at least one item
  TestValidator.predicate("has avatar data array", avatarList.data.length >= 1);
  // 6. Validate avatar summary structure
  const avatar = avatarList.data[0];
  TestValidator.equals("userId matches", avatar.userId, authorized.id);
  TestValidator.predicate("has valid id", avatar.id.length > 0);
  TestValidator.predicate("has valid file metadata", avatar.file !== null);
  TestValidator.predicate("mimeType is valid", avatar.file.mimeType.length > 0);
  TestValidator.predicate("fileSize > 0", avatar.file.fileSize > 0);
  TestValidator.predicate(
    "originalFilename exists",
    avatar.file.originalFilename.length > 0,
  );
  TestValidator.predicate("status exists", avatar.file.status.length > 0);
  TestValidator.predicate(
    "createdAt is valid date",
    avatar.createdAt.length > 0,
  );
}