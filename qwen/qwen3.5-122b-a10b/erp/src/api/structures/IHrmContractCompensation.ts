import { tags } from "typia";

import { IHrmDepartment } from "./IHrmDepartment";
import { IHrmEmployee } from "./IHrmEmployee";

export namespace IHrmContractCompensation {
  /**
   * Contract compensation summary for organizational budget review and HR administration.
   *
   * This type represents a single contract compensation record in the contract compensation report, containing employee details, compensation terms, and contract status information for managers and organization owners to review compensation structures and budget planning.
   *
   * **Fields**
   *
   * - Contract identification and compensation details (pay_rate, pay_period, working_hours_per_week)
   * - Contract period (start_date, end_date where NULL indicates active contract)
   * - Employee reference with position, employment type, and status (employee)
   * - Department reference (department, nullable, for organizational hierarchy)
   *
   * **Usage**
   *
   * Returned as items in paginated contract compensation reports. Access requires time:view_all permission. Results are filtered by organization context and exclude soft-deleted records.
   */
  export type ISummary = {
    /**
     * Unique identifier for the employment contract.
     *
     * This UUID serves as the primary key for the contract record and is used for all contract-specific operations including updates, deletions, and snapshot retrieval.
     *
         * @x-autobe-specification Computed from hrm_contracts.id. Primary key
         *   uniquely identifying each employment contract record in the
         *   aggregation result.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The compensation rate specified in this contract.
     *
     * The actual unit (per hour, day, week, or month) is determined by the pay_period field. This numeric value is used for payroll calculations, budget tracking, and employment verification. The value should be stored in the organization's base currency as defined in the organization settings.
     *
         * @x-autobe-specification Computed from hrm_contracts.pay_rate. Numeric
         *   value stored in organization's base currency (defined in
         *   hrm_organizations.currency).
     */
    pay_rate: number;

    /**
     * The frequency at which the pay_rate is applied.
     *
     * Valid values are:
     * - hourly: Pay rate per hour worked
     * - daily: Pay rate per day worked
     * - weekly: Pay rate per week
     * - monthly: Pay rate per month
     *
     * This field determines how the pay_rate value should be interpreted for payroll calculations and compensation comparisons.
     *
         * @x-autobe-specification Computed from hrm_contracts.pay_period.
         *   String enumeration: hourly, daily, weekly, or monthly.
     */
    pay_period: string;

    /**
     * The expected number of working hours per week under this contract.
     *
     * Optional field for contracts where hourly tracking is relevant. This value is used for full-time vs part-time classification, overtime calculations, and compliance with labor regulations. May be null for contractor, intern, or irregular work arrangements where fixed weekly hours are not defined.
     *
         * @x-autobe-specification Computed from
         *   hrm_contracts.working_hours_per_week. Nullable numeric field. NULL
         *   indicates contract where hourly tracking is not relevant (e.g.,
         *   contractor or irregular work arrangements).
     */
    working_hours_per_week?: number | null | undefined;

    /**
     * The effective start date of this employment contract.
     *
     * Marks when the contractual terms become active. This field is required and cannot be null. When creating a new contract, the system validates that the start_date does not overlap with existing active contracts for the same employee. The previous active contract's end_date is automatically set to one day before the new contract's start_date.
     *
         * @x-autobe-specification Computed from hrm_contracts.start_date.
         *   DateTime with timezone (timestamptz). Required field - cannot be
         *   null.
     */
    start_date: string & tags.Format<"date-time">;

    /**
     * The effective end date of this employment contract.
     *
     * A NULL value indicates the contract is currently active. When a new contract is created for an employee, the previous active contract's end_date is automatically set to one day before the new contract's start_date. Once end_date is populated, the contract becomes immutable to preserve historical accuracy for audit and compliance purposes.
     *
         * @x-autobe-specification Computed from hrm_contracts.end_date.
         *   Nullable DateTime with timezone (timestamptz). NULL value indicates
         *   the contract is currently active.
     */
    end_date?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * The employee associated with this contract.
     *
     * Contains essential employee information including position, employment type, employment status, and user profile reference. This relation is required as every contract must belong to exactly one employee. The employee data is filtered to match the organization context from the request path parameter.
     *
         * @x-autobe-specification Computed via LEFT JOIN from
         *   hrm_contracts.hrm_employee_id to hrm_employees.id. Returns
         *   IHrmEmployee.ISummary containing position, employment_type, status,
         *   and user reference. Filtered by organization_id from path
         *   parameter.
     */
    employee: IHrmEmployee.ISummary;

    /**
     * The department to which this employee belongs.
     *
     * Optional department assignment for organizational hierarchy. Returns NULL if the employee is not assigned to any department within the organization. When present, contains the department's identifier, name, and optional description for organizational context in compensation reports.
     *
         * @x-autobe-specification Computed via LEFT JOIN from
         *   hrm_employees.department_id to hrm_departments.id. Returns
         *   IHrmDepartment.ISummary or NULL if employee has no department
         *   assignment. Nullable field.
     */
    department?: IHrmDepartment.ISummary | null | undefined;
  };
}
