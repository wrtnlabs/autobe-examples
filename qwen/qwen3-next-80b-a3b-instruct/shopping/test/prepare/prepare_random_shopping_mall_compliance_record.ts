import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import { IShoppingMallComplianceFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceFile";
export function prepare_random_shopping_mall_compliance_record(
  input?: DeepPartial<IShoppingMallComplianceRecord.ICreate> | undefined,
): IShoppingMallComplianceRecord.ICreate {
  return {
    compliance_type:
      input?.compliance_type ??
      RandomGenerator.pick([
        "GDPR",
        "CCPA",
        "PCI-DSS",
        "SOC2",
        "ISO27001",
        "InternalDataPrivacyPolicy",
        "FinancialReporting",
        "DataRetention",
        "AccessControl",
        "EncryptionStandard",
        "SecurityAudit",
      ] as const),
    compliance_category:
      input?.compliance_category ??
      RandomGenerator.pick([
        "DataPrivacy",
        "DataSecurity",
        "AuditLogging",
        "AccessControl",
        "DataRetention",
        "ReportingObligation",
        "VendorManagement",
        "FinancialCompliance",
        "OperationalControl",
      ] as const),
    status: "pending_review",
    evidence_url:
      input?.evidence_url ?? typia.random<string & tags.Format<"uri">>(),
    notes:
      input?.notes ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    issue_date: new Date().toISOString(),
    expiry_date:
      input?.expiry_date ??
      new Date(new Date().getTime() + 86400000 * 365).toISOString(),
    verified_by: input?.verified_by ?? RandomGenerator.name(2),
    attached_files: input?.attached_files
      ? input.attached_files.map((file) => ({
          file_name: file.file_name ?? `${RandomGenerator.alphabets(8)}.pdf`,
          file_size:
            file.file_size ??
            typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<10485760>
            >(),
          file_type:
            file.file_type ??
            RandomGenerator.pick([
              "application/pdf",
              "image/png",
              "image/jpeg",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ] as const),
          content_hash: file.content_hash ?? RandomGenerator.alphaNumeric(64),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            file_name: `${RandomGenerator.alphabets(8)}.pdf`,
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<10485760>
            >(),
            file_type: RandomGenerator.pick([
              "application/pdf",
              "image/png",
              "image/jpeg",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ] as const),
            content_hash: RandomGenerator.alphaNumeric(64),
          }),
        ),
    policy_reference:
      input?.policy_reference ??
      `POL-${new Date().getFullYear()}-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>().toString().padStart(3, "0")}`,
  };
}
