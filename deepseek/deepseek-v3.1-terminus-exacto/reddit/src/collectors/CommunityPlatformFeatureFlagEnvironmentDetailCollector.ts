import { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformFeatureFlagEnvironmentDetailCollector {
  export async function collect(props: {
    body: ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate;
    featureFlag: IEntity;
    environment: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      featureFlag: { connect: { id: props.featureFlag.id } },
      environment: { connect: { id: props.environment.id } },
      // HasMany relations - omitted when not provided
    } satisfies Prisma.community_platform_feature_flag_environment_detailsCreateInput;
  }
}
