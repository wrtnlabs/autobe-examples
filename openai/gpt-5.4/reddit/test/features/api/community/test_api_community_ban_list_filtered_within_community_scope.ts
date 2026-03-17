import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_list_filtered_within_community_scope(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: "https://admin.example.com/moderation/bans" satisfies string as string &
        tags.Format<"uri">,
      referrer:
        "https://admin.example.com/moderation" satisfies string as string &
          tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const baselineRequest = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityBan.IRequest;
  await TestValidator.error(
    "unknown community rejects baseline active-ban list",
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.index(
        adminConnection,
        {
          communityId,
          body: baselineRequest,
        },
      );
    },
  );
  const filteredRequest = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityBan.IRequest;
  await TestValidator.error(
    "unknown community rejects filtered active-ban list",
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.index(
        adminConnection,
        {
          communityId,
          body: filteredRequest,
        },
      );
    },
  );
  const now = new Date();
  const timestampRequest = {
    started_at: new Date(
      now.getTime() - 1000 * 60 * 60 * 24,
    ).toISOString() satisfies string as string & tags.Format<"date-time">,
    updated_at: now.toISOString() satisfies string as string &
      tags.Format<"date-time">,
    expired_at: null,
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityBan.IRequest;
  await TestValidator.error(
    "unknown community rejects timestamp-filtered active-ban list",
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.index(
        adminConnection,
        {
          communityId,
          body: timestampRequest,
        },
      );
    },
  );
}
