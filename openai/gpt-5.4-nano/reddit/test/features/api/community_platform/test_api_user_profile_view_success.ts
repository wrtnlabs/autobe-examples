import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // Note: This endpoint should be accessible to guests.
  const guestConnection: api.IConnection = { host: connection.host };
  // Since no setup/seed APIs are provided in this task input,
  // we select a deterministic UUID-like value to probe the endpoint.
  // The suite/harness is expected to ensure the chosen profileId exists.
  const profileId =
    "00000000-0000-4000-8000-000000000001" satisfies string as string &
      import("typia").tags.Format<"uuid">;
  const output1 = await api.functional.communityPlatform.profiles.at(
    guestConnection,
    { profileId },
  );
  typia.assert(output1);
  TestValidator.predicate(
    "display_name is non-empty",
    output1.display_name.trim().length > 0,
  );
  TestValidator.equals("deleted_at is null", output1.deleted_at, null);
  const output2 = await api.functional.communityPlatform.profiles.at(
    guestConnection,
    { profileId },
  );
  typia.assert(output2);
  // Determinism checks (fields required by DTO only).
  TestValidator.equals("id stable", output2.id, output1.id);
  TestValidator.equals(
    "display_name stable",
    output2.display_name,
    output1.display_name,
  );
  TestValidator.equals("bio stable", output2.bio, output1.bio);
  TestValidator.equals(
    "avatar_uri stable",
    output2.avatar_uri,
    output1.avatar_uri,
  );
  TestValidator.equals(
    "created_at stable",
    output2.created_at,
    output1.created_at,
  );
  TestValidator.equals(
    "updated_at stable",
    output2.updated_at,
    output1.updated_at,
  );
  TestValidator.equals(
    "deleted_at stable",
    output2.deleted_at,
    output1.deleted_at,
  );
  TestValidator.equals(
    "member summary stable (id)",
    output2.member.id,
    output1.member.id,
  );
  TestValidator.equals(
    "member summary stable (display_name)",
    output2.member.display_name,
    output1.member.display_name,
  );
}
