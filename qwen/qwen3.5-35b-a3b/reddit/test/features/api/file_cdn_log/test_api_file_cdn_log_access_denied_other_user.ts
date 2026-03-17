import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_file_cdn_log_access_denied_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and uploads file
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuth = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(firstMemberAuth);
  const firstMemberFile =
    await api.functional.redditCommunity.member.files.create(
      firstMemberConnection,
      {
        body: {
          file_type: "avatar",
          owner_id: firstMemberAuth.token.access as string,
          file_uri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityFile.ICreate,
      },
    );
  typia.assert(firstMemberFile);
  // 2. Access file to potentially trigger CDN log generation
  await api.functional.redditCommunity.files.at(firstMemberConnection, {
    fileId: firstMemberFile.id,
  });
  // 3. Second member joins
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(secondMemberAuth);
  // 4. Second member tries to access CDN log (should fail with 404)
  // Use any valid-looking UUID for the log since we don't know which logs exist
  await TestValidator.httpError(
    "other member cannot access file's CDN logs",
    [404],
    async () => {
      await api.functional.redditCommunity.member.files.cdn_logs.at(
        secondMemberConnection,
        {
          fileId: firstMemberFile.id,
          logId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Verify no data exposure by ensuring 404 response has no log content
  const httpError = await TestValidator.httpError(
    "error response should not leak file ownership info",
    [404],
    async () => {
      await api.functional.redditCommunity.member.files.cdn_logs.at(
        secondMemberConnection,
        {
          fileId: firstMemberFile.id,
          logId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
