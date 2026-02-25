import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformFeatureFlagEnvironmentCollector {
  export async function collect(props: {
    body: ICommunityPlatformFeatureFlagEnvironment.ICreate;
    communityPlatformFeatureFlags: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      is_enabled: props.body.is_enabled,
      rollout_percentage: props.body.rollout_percentage ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      featureFlag: { connect: { id: props.communityPlatformFeatureFlags.id } },
      // HasMany relations - not applicable for creation
      flagDetails: undefined,
      targetingRules: undefined,
    } satisfies Prisma.community_platform_feature_flag_environmentsCreateInput;
  }
}
