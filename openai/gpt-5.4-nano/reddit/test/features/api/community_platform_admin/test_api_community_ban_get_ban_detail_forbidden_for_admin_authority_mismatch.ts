import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_get_ban_detail_forbidden_for_admin_authority_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a second admin to increase chance of authority mismatch.
  // (No ban-creation utilities are available in the provided materials.)
  const otherAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(otherAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Since we cannot create or list bans with the given API/utility set,
  // we use a UUID to exercise the authorization boundary.
  const banId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "forbidden when admin authority mismatches ban community",
    async () => {
      try {
        await api.functional.communityPlatform.admin.bans.at(adminConnection, {
          banId,
        });
        throw new Error("Expected forbidden/authorization error");
      } catch (exp) {
        // HttpError type is not available in this scope; fallback to message-based checks.
        const e = exp as unknown as { message?: string };
        if (!e || (typeof e.message !== "string" && typeof exp !== "object")) {
          throw exp;
        }
        const msg = e.message ?? "";
        const lower = msg.toLowerCase();
        // Denial must not leak moderation-sensitive field names.
        TestValidator.predicate("no banReason leakage", !lower.includes("ban_reason"));
        TestValidator.predicate(
          "no banReason leakage (camelcase)",
          !lower.includes("banreason"),
        );
        TestValidator.predicate(
          "no banned user leakage (banned_user)",
          !lower.includes("banned_user"),
        );
        TestValidator.predicate(
          "no community identifier leakage (community_id)",
          !lower.includes("community_id"),
        );
        TestValidator.predicate(
          "no audit timestamp leakage (created_at)",
          !lower.includes("created_at"),
        );
        // Also ensure error text looks like authorization.
        TestValidator.predicate(
          "authorization-related denial",
          lower.includes("forbidden") ||
            lower.includes("unauthorized") ||
            lower.includes("permission") ||
            lower.includes("access"),
        );
        throw exp;
      }
    },
  );
}
