import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_file_deletion_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 and create file
  const member1AuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1AuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const member1Connection: api.IConnection = {
    host: connection.host,
    headers: member1AuthConnection.headers,
  };
  const file = await generate_random_reddit_clone_member_files_create(
    member1Connection,
    {},
  );
  typia.assert(file);
  // 2. Authenticate as member2
  const member2AuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2AuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const member2Connection: api.IConnection = {
    host: connection.host,
    headers: member2AuthConnection.headers,
  };
  // 3. Attempt to delete member1's file as member2 - should fail with 403
  await TestValidator.httpError(
    "non-owner cannot delete another user's file",
    403,
    async () =>
      await api.functional.redditClone.member.files.erase(member2Connection, {
        fileId: file.id,
      }),
  );
  // 4. Verify member1 can still access their file (not deleted)
  const member1File = await generate_random_reddit_clone_member_files_create(
    member1Connection,
    {},
  );
  typia.assert(member1File);
  TestValidator.equals(
    "file should still exist for owner",
    member1File.id,
    file.id,
  );
}
