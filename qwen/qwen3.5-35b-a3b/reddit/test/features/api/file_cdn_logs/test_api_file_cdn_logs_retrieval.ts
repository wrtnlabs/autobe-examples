import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileCdnLog";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileCdnLog";
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

export async function test_api_file_cdn_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test123!",
      href: "http://test.example.com/register",
      referrer: "http://test.example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create member-specific connection with JWT token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Upload avatar image file for the member
  // Note: owner_id is generated as UUID since join response doesn't include user ID
  const ownerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const file = await api.functional.redditCommunity.member.files.create(
    memberAuthConnection,
    {
      body: {
        file_type: "avatar" as const,
        owner_id: ownerId,
        file_uri: "http://test.example.com/avatar.png",
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Retrieve CDN delivery logs for the uploaded file
  const cdnLogs =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      memberAuthConnection,
      {
        fileId: file.id,
        body: {
          page: 1,
          per_page: 20,
        },
      },
    );
  typia.assert(cdnLogs);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination current page",
    cdnLogs.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", cdnLogs.pagination.limit, 20);
  TestValidator.equals("pagination records", cdnLogs.pagination.records, 0);
  TestValidator.equals("pagination pages", cdnLogs.pagination.pages, 0);
  TestValidator.equals(
    "data array is empty (no CDN logs yet)",
    cdnLogs.data.length,
    0,
  );
}
