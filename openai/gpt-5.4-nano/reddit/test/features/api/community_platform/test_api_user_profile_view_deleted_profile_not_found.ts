import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_view_deleted_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Guest: base connection only, never use `connection` directly.
  const guestConnection: api.IConnection = { host: connection.host };
  // We don't have APIs to create/soft-delete a profile in the given SDK.
  // Use a random UUID as a candidate deleted profile identifier.
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const forbiddenSubstrings = [
    "display_name",
    "bio",
    "avatar_uri",
    "member",
    "community_platform_member_id",
  ];
  // 1st call: must be not found.
  await TestValidator.httpError(
    "deleted profile must not be publicly viewable (first call)",
    404,
    async () => {
      try {
        await api.functional.communityPlatform.profiles.at(guestConnection, {
          profileId,
        });
      } catch (err) {
        if (err instanceof api.HttpError) {
          const message = String(err.message ?? "");
          for (const s of forbiddenSubstrings) {
            TestValidator.predicate(
              `error payload must not leak deleted persona field: ${s}`,
              !message.includes(s),
            );
          }
        }
        throw err;
      }
    },
  );
  // 2nd call (edge-case repeat): must stay consistent.
  await TestValidator.httpError(
    "deleted profile must not be publicly viewable (second call)",
    404,
    async () => {
      try {
        await api.functional.communityPlatform.profiles.at(guestConnection, {
          profileId,
        });
      } catch (err) {
        if (err instanceof api.HttpError) {
          const message = String(err.message ?? "");
          for (const s of forbiddenSubstrings) {
            TestValidator.predicate(
              `error payload must not leak deleted persona field on repeat: ${s}`,
              !message.includes(s),
            );
          }
        }
        throw err;
      }
    },
  );
}
