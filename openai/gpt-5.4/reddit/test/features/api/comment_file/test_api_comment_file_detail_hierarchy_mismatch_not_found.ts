import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_files_create";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";

export async function test_api_comment_file_detail_hierarchy_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin1234!";
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    },
  });
  typia.assert(adminJoined);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminAuthorized);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuthorized);
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const createdFile =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId,
          commentId,
        },
      },
    );
  typia.assert(createdFile);
  const mismatchedCommentId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "mismatched comment id differs from original comment id",
    mismatchedCommentId,
    commentId,
  );
  await TestValidator.httpError(
    "comment file detail rejects mismatched comment hierarchy as not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.comments.files.at(
        adminConnection,
        {
          postId,
          commentId: mismatchedCommentId,
          fileId: createdFile.id,
        },
      );
    },
  );
}
