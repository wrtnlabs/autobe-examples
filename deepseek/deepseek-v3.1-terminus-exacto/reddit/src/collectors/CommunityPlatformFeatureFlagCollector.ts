import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformFeatureFlagCollector {
  export async function collect(props: {
    body: ICommunityPlatformFeatureFlag.ICreate;
  }) {
    const id: string = v4();
    // Determine values based on flag_type
    const booleanValue =
      props.body.flag_type === "boolean"
        ? (props.body.boolean_value ?? null)
        : null;
    const percentageValue =
      props.body.flag_type === "percentage"
        ? (props.body.percentage_value ?? null)
        : null;
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      flag_type: props.body.flag_type,
      status: props.body.status,
      boolean_value: booleanValue,
      percentage_value: percentageValue,
      rollout_started_at: null,
      rollout_completed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      targetingRules: undefined,
      environmentConfigurations: undefined,
      environmentDetails: undefined,
    } satisfies Prisma.community_platform_feature_flagsCreateInput;
  }
}
