import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_file_active_public_metadata_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
  };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const fileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const output: ICommunityPlatformProfileFile =
    await api.functional.communityPlatform.member.profiles.files.at(
      memberConnection,
      {
        fileId,
      },
    );
  typia.assert<ICommunityPlatformProfileFile>(output);
  TestValidator.predicate("category is non-empty", output.category.length > 0);
  TestValidator.predicate(
    "original name is non-empty",
    output.original_name.length > 0,
  );
  TestValidator.predicate(
    "extension is non-empty",
    output.extension.length > 0,
  );
  TestValidator.predicate(
    "mime type is non-empty",
    output.mime_type.length > 0,
  );
  TestValidator.predicate("file size is non-negative", output.size >= 0);
  TestValidator.predicate("url is non-empty", output.url.length > 0);
  TestValidator.equals("file remains active", output.deleted_at, null);
}
