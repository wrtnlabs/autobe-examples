import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function test_api_profile_public_view_existing_profile(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
  };
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.communityPlatform.profiles.at(
    guestConnection,
    {
      profileId,
    },
  );
  typia.assert<ICommunityPlatformProfile>(output);
  TestValidator.equals("profile id matches request", output.id, profileId);
  TestValidator.predicate(
    "display name is non-empty",
    output.display_name.length > 0,
  );
  TestValidator.predicate(
    "karma is a finite integer",
    Number.isFinite(output.karma) && Number.isInteger(output.karma),
  );
  TestValidator.predicate(
    "deleted_at is nullable timestamp",
    output.deleted_at === null || typeof output.deleted_at === "string",
  );
  for (const file of output.files) {
    typia.assert<ICommunityPlatformProfileFile>(file);
    TestValidator.predicate(
      "file category is non-empty",
      file.category.length > 0,
    );
    TestValidator.predicate(
      "file original name is non-empty",
      file.original_name.length > 0,
    );
    TestValidator.predicate(
      "file extension is non-empty",
      file.extension.length > 0,
    );
    TestValidator.predicate(
      "file mime type is non-empty",
      file.mime_type.length > 0,
    );
    TestValidator.predicate("file url is non-empty", file.url.length > 0);
    TestValidator.equals("profile file is active", file.deleted_at, null);
  }
  for (const post of output.posts) {
    typia.assert<ICommunityPlatformPost.ISummary>(post);
    TestValidator.equals("post is publicly visible", post.deleted_at, null);
    TestValidator.predicate("post title is non-empty", post.title.length > 0);
  }
  typia.assert<ICommunityPlatformComment>(output.comments);
}
