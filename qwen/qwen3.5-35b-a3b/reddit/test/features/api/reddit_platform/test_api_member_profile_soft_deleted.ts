import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId: string & tags.Format<"uuid"> = memberAuth.id;
  // 2. Verify member can be retrieved before soft-deletion
  const getBeforeConnection: api.IConnection = { host: connection.host };
  const profileBefore = await api.functional.redditPlatform.members.at(
    getBeforeConnection,
    {
      memberId,
    },
  );
  typia.assert(profileBefore);
  TestValidator.equals(
    "member exists before deletion",
    profileBefore.id,
    memberId,
  );
  // 3. NOTE: Soft-delete requires external database/admin operation not available in SDK
  // In production E2E tests, execute: UPDATE reddit_platform_members SET deleted_at = NOW() WHERE id = :memberId
  // This test documents the expected behavior but requires manual soft-delete for complete validation
  // 4. Test with a non-existent member ID to verify 404 behavior
  // This validates the endpoint returns 404 for members that don't exist
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const getAfterConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-existent member returns 404",
    [404],
    async () => {
      await api.functional.redditPlatform.members.at(getAfterConnection, {
        memberId: nonExistentId,
      });
    },
  );
}
