import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostStatus";
import { prepare_random_community_bbs_post_status } from "../prepare/prepare_random_community_bbs_post_status";
export async function generate_random_community_bbs_admin_post_statuses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsPostStatus.ICreate>;
  },
): Promise<void> {
  const prepared: ICommunityBbsPostStatus.ICreate =
    prepare_random_community_bbs_post_status(props.body);
  const result: void =
    await api.functional.communityBbs.admin.post_statuses.create(connection, {
      body: prepared,
    });
  return result;
}
