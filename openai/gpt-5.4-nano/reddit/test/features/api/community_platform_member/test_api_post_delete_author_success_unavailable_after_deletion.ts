import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_delete_author_success_unavailable_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Actor A joins
  const memberAAuth = await authorize_member_join(connection, {});
  typia.assert(memberAAuth);
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers ??= {};
  memberAConnection.headers.Authorization = memberAAuth.token.access;
  // Since only DELETE endpoint is available in the provided API surface,
  // we cannot create a real post nor verify feed/detail unavailability.
  // We can still verify idempotency-ish behavior: repeated deletion
  // of the same (non-existent or already removed) postId is rejected.
  const postId = typia.random<string>();
  await api.functional.communityPlatform.member.posts.erase(memberAConnection, {
    postId: postId as string,
  });
  await TestValidator.error(
    "repeating delete for the same postId should be rejected as unavailable",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(
        memberAConnection,
        { postId: postId as string },
      );
    },
  );
}
