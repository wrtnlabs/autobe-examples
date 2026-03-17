import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileThumbnail";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_file_pagination_thumbnail_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResponse);
  const token: IAuthorizationToken = authResponse.token;
  // 2. Create post image file with thumbnails
  const fileConnection: api.IConnection = { host: connection.host };
  fileConnection.headers = {
    ...fileConnection.headers,
    Authorization: token.access,
  };
  const file = await generate_random_reddit_community_member_files_create(
    fileConnection,
    {
      body: {
        file_type: "post" as const,
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Test pagination with different page sizes
  const fileId: string & tags.Format<"uuid"> = file.id;
  // 3.1 Default pagination (limit=20)
  const page1: IPageIRedditCommunityFileThumbnail.ISummary =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId,
        body: {} satisfies IRedditCommunityFileThumbnail.IRequest,
      },
    );
  typia.assert(page1);
  // 3.2 Custom pagination (limit=50)
  const page2: IPageIRedditCommunityFileThumbnail.ISummary =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId,
        body: {
          limit: 50,
        } satisfies IRedditCommunityFileThumbnail.IRequest,
      },
    );
  typia.assert(page2);
  // 3.3 Maximum pagination (limit=100)
  const page3: IPageIRedditCommunityFileThumbnail.ISummary =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId,
        body: {
          limit: 100,
        } satisfies IRedditCommunityFileThumbnail.IRequest,
      },
    );
  typia.assert(page3);
  // 4. Validate pagination metadata
  TestValidator.equals("page1 current page", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 20);
  TestValidator.predicate("page1 has records", page1.pagination.records > 0);
  TestValidator.predicate("page1 has pages", page1.pagination.pages >= 1);
  // 5. Test cursor-based request
  const page4: IPageIRedditCommunityFileThumbnail.ISummary =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId,
        body: {
          limit: 20,
        } satisfies IRedditCommunityFileThumbnail.IRequest,
      },
    );
  typia.assert(page4);
  // 6. Validate thumbnail summary structure
  if (page1.data.length > 0) {
    const thumbnail: IRedditCommunityFileThumbnail.ISummary = page1.data[0];
    TestValidator.predicate(
      "thumbnail has url",
      thumbnail.thumbnailUrl.length > 0,
    );
    TestValidator.predicate("thumbnail has width", thumbnail.width > 0);
    TestValidator.predicate("thumbnail has height", thumbnail.height > 0);
    TestValidator.predicate(
      "thumbnail has format",
      thumbnail.format.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has variant",
      thumbnail.variant.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has createdAt",
      thumbnail.createdAt.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has updatedAt",
      thumbnail.updatedAt.length > 0,
    );
    TestValidator.equals("thumbnail has deletedAt", thumbnail.deletedAt, null);
    TestValidator.predicate(
      "thumbnail has file",
      thumbnail.redditCommunityFile !== undefined,
    );
  }
  // 7. Validate limit is respected in pagination
  TestValidator.equals("page2 limit is 50", page2.pagination.limit, 50);
  TestValidator.equals("page3 limit is 100", page3.pagination.limit, 100);
  // 8. Validate data arrays are returned
  TestValidator.predicate("page1 has data", page1.data.length > 0);
  TestValidator.predicate("page2 has data", page2.data.length > 0);
  TestValidator.predicate("page3 has data", page3.data.length > 0);
  TestValidator.predicate("page4 has data", page4.data.length > 0);
}
