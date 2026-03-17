import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_ban_reason } from "../prepare/prepare_random_community_platform_ban_reason";

export async function generate_random_community_platform_admin_ban_reasons_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformBanReason.ICreate> | undefined;
  },
): Promise<ICommunityPlatformBanReason> {
  const prepared: ICommunityPlatformBanReason.ICreate =
    prepare_random_community_platform_ban_reason(props.body);
  return await api.functional.communityPlatform.admin.ban_reasons.create(
    connection,
    {
      body: prepared,
    },
  );
}
