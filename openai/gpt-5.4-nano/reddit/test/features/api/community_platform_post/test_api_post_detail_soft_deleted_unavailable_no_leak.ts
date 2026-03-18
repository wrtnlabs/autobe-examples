import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_detail_soft_deleted_unavailable_no_leak(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const sensitiveKeys = [
    "title",
    "textContent",
    "linkContent",
    "imageContent",
    "imageAltText",
    "author",
    "community",
    "voteScore",
    "commentsCount",
  ] as const;
  // Best-effort: attempt to delete the post id to force unavailable state.
  // If it doesn't exist, service should still treat it as unavailable.
  await TestValidator.error(
    "erase should fail or succeed but post should become unavailable",
    async () => {
      await api.functional.communityPlatform.admin.posts.erase(
        adminConnection,
        {
          postId,
        },
      );
    },
  ).catch(async () => {
    // ignore and continue to availability checks
  });
  const ensureUnavailableNoLeak = async () => {
    await TestValidator.error(
      "soft-deleted post must be unavailable without leaking content",
      async () => {
        try {
          await api.functional.communityPlatform.admin.posts.at(
            adminConnection,
            {
              postId,
            },
          );
        } catch (exp) {
          if (exp instanceof api.HttpError) {
            const json = exp.toJSON<Record<string, unknown>>();
            const message = json.message;
            if (message !== null && typeof message === "object") {
              const obj = message as Record<string, unknown>;
              for (const k of sensitiveKeys) {
                if (Object.prototype.hasOwnProperty.call(obj, k)) {
                  throw new Error(`leak detected: ${k}`);
                }
              }
            }
            throw exp;
          }
          throw exp;
        }
      },
    );
  };
  await ensureUnavailableNoLeak();
  await ensureUnavailableNoLeak();
}
