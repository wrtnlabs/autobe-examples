import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPolicy";
export function prepare_random_shopping_mall_security_policy(
  input?: DeepPartial<IShoppingMallSecurityPolicy.ICreate>,
): IShoppingMallSecurityPolicy.ICreate {
  return {
    // Test-customizable fields - policy name and description
    policy_name: input?.policy_name ?? RandomGenerator.name(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<8>
        >(),
        sentenceMin: 10,
        sentenceMax: 20,
      }),
    // Enum fields with fixed options
    scope:
      input?.scope ??
      RandomGenerator.pick([
        "system-wide",
        "user-level",
        "payment-related",
      ] as const),
    enforcement_level:
      input?.enforcement_level ??
      RandomGenerator.pick(["mandatory", "recommended", "optional"] as const),
    // Date-time fields with ISO 8601 format
    effective_from:
      input?.effective_from ??
      typia.random<string & tags.Format<"date-time">>(),
    effective_to:
      input?.effective_to ??
      (typia.random<number>() > 0.7
        ? null
        : typia.random<string & tags.Format<"date-time">>()),
    // Compliance standards array with minItems: 1
    compliance_standards:
      input?.compliance_standards ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        () =>
          RandomGenerator.pick([
            "GDPR",
            "CCPA",
            "PCI-DSS",
            "SOC2",
            "HIPAA",
            "ISO 27001",
          ] as const),
      ),
  };
}
