import { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSystemMetricCollector {
  export async function collect(props: {
    body: ICommunityPlatformSystemMetric.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      metric_type: props.body.metric_type,
      value: props.body.value,
      timestamp: props.body.timestamp,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_system_metricsCreateInput;
  }
}
