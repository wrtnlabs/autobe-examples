import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhook";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_webhook } from "../prepare/prepare_random_reddit_platform_webhook";

export async function generate_random_reddit_platform_admin_webhooks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformWebhook.ICreate> | undefined;
  },
): Promise<IRedditPlatformWebhook.ICreate> {
  const prepared: IRedditPlatformWebhook.ICreate =
    prepare_random_reddit_platform_webhook(props.body);
  const result: IRedditPlatformWebhook.ICreate =
    await api.functional.redditPlatform.admin.webhooks.create(connection, {
      body: prepared,
    });
  return result;
}
