import { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverrideCollector {
  export function collect(props: {
    body: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate;
    featureFlagEnvironmentDetail: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields - directly from DTO
      id,
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Required belongsTo relation - using relation property name not FK column
      // Connects to the parent feature flag environment detail
      featureFlagEnvironmentDetail: {
        connect: { id: props.featureFlagEnvironmentDetail.id },
      },
    } satisfies Prisma.community_platform_feature_flag_environment_detail_configuration_overridesCreateInput;
  }
}
