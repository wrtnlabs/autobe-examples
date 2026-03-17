import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_member_password_reset } from "../prepare/prepare_random_community_platform_member_password_reset";

export async function generate_random_community_platform_admin_password_resets_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformMemberPasswordReset.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformMemberPasswordReset> {
  const prepared: ICommunityPlatformMemberPasswordReset.ICreate =
    prepare_random_community_platform_member_password_reset(props.body);
  return await api.functional.communityPlatform.admin.password_resets.create(
    connection,
    {
      body: prepared,
    },
  );
}
