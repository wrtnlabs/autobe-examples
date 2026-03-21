import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileAssociation";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_file_association_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a test file
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(file);
  // 3. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 4. Associate the file with the community
  const fileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: file.id,
          targetId: community.id,
          targetType: "community",
        } satisfies IRedditCloneFileAssociation.ICreate,
      },
    );
  typia.assert(fileAssociation);
  // 5. Test file association listing with pagination
  const pageNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number;
  const limitValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number;
  const response = await api.functional.redditClone.file_associations.index(
    memberConnection,
    {
      body: {
        page: pageNumber,
        limit: limitValue,
        targetType: "community",
      } satisfies IRedditCloneFileAssociation.IRequest,
    },
  );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    pageNumber,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    limitValue,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 7. Validate response contains array of file association summaries
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate("data length >= 1", response.data.length >= 1);
  // 8. Validate file association summary structure
  const createdAssociation = response.data.find(
    (item) => item.id === fileAssociation.id,
  );
  TestValidator.predicate(
    "found created file association",
    createdAssociation !== undefined,
  );
  if (createdAssociation) {
    TestValidator.equals(
      "target type matches",
      createdAssociation.target_type,
      "community",
    );
    TestValidator.equals(
      "target id matches",
      createdAssociation.target_id,
      community.id,
    );
    TestValidator.predicate(
      "has nested file metadata",
      createdAssociation.file !== undefined,
    );
    TestValidator.equals("file id matches", createdAssociation.file.id, file.id);
    TestValidator.predicate(
      "file original filename exists",
      createdAssociation.file.originalFilename !== undefined,
    );
    TestValidator.predicate(
      "file mime type exists",
      createdAssociation.file.mimeType !== undefined,
    );
    TestValidator.predicate(
      "file size is positive",
      createdAssociation.file.fileSize > 0,
    );
    TestValidator.predicate(
      "file status exists",
      createdAssociation.file.status !== undefined,
    );
  }
}