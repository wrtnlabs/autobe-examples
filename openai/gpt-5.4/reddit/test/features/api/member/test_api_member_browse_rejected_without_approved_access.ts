import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_browse_rejected_without_approved_access(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = {
    host: connection.host,
  };
  const body = {
    code: `member-${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    status: RandomGenerator.paragraph({ sentences: 1 }),
    created_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    created_to: new Date().toISOString(),
    updated_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_to: new Date().toISOString(),
    last_signed_in_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 14,
    ).toISOString(),
    last_signed_in_to: new Date().toISOString(),
    sort: "+created_at",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformMember.IRequest;
  await TestValidator.httpError(
    "member browse requires explicitly approved access",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.members.index(
        anonymousConnection,
        {
          body,
        },
      );
    },
  );
}
