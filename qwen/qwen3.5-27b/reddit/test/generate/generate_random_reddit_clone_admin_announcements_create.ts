import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_announcement } from "../prepare/prepare_random_reddit_clone_announcement";

export async function generate_random_reddit_clone_admin_announcements_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneAnnouncement.ICreate> | undefined;
  },
): Promise<IRedditCloneAnnouncement> {
  const prepared: IRedditCloneAnnouncement.ICreate =
    prepare_random_reddit_clone_announcement(props.body);
  return await api.functional.redditClone.admin.announcements.create(
    connection,
    {
      body: prepared,
    },
  );
}
