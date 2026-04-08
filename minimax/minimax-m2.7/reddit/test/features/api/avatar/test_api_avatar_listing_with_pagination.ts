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

export async function test_api_avatar_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Upload 3 avatar images for pagination test
  const avatar1 = await generate_random_reddit_clone_member_avatars_create(
    memberConnection,
    {},
  );
  typia.assert(avatar1);
  const avatar2 = await generate_random_reddit_clone_member_avatars_create(
    memberConnection,
    {},
  );
  typia.assert(avatar2);
  const avatar3 = await generate_random_reddit_clone_member_avatars_create(
    memberConnection,
    {},
  );
  typia.assert(avatar3);
  // 3. Query first page with limit=2
  const firstPage = await api.functional.redditClone.member.avatars.index(
    memberConnection,
    {
      body: {
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFileAssociation.IRequest,
    },
  );
  typia.assert(firstPage);
  // 4. Verify first page contains exactly 2 avatars
  TestValidator.equals("first page count", firstPage.data.length, 2);
  // 5. Verify pagination metadata for first page
  TestValidator.equals("total records", firstPage.pagination.records, 3);
  TestValidator.equals("total pages", firstPage.pagination.pages, 2);
  TestValidator.equals("current page", firstPage.pagination.current, 1);
  TestValidator.equals("limit", firstPage.pagination.limit, 2);
  // 6. Query second page with same limit=2
  const secondPage = await api.functional.redditClone.member.avatars.index(
    memberConnection,
    {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFileAssociation.IRequest,
    },
  );
  typia.assert(secondPage);
  // 7. Verify second page contains remaining avatar (1 avatar)
  TestValidator.equals("second page count", secondPage.data.length, 1);
  // 8. Verify pagination metadata for second page
  TestValidator.equals(
    "total records (page 2)",
    secondPage.pagination.records,
    3,
  );
  TestValidator.equals("total pages (page 2)", secondPage.pagination.pages, 2);
  TestValidator.equals(
    "current page (page 2)",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("limit (page 2)", secondPage.pagination.limit, 2);
}