import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import { prepare_random_community_bbs_user_status } from "../prepare/prepare_random_community_bbs_user_status";
export async function generate_random_community_bbs_admin_users_status_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsUserStatus.ICreate>;
  },
): Promise<ICommunityBbsUserStatus> {
  const prepared: ICommunityBbsUserStatus.ICreate =
    prepare_random_community_bbs_user_status(props.body);
  return await api.functional.communityBbs.admin.users.status.create(
    connection,
    {
      body: prepared,
    },
  );
}
